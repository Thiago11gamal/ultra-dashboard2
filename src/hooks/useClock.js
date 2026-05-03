import { useEffect, useState } from 'react';

/**
 * Custom hook that returns the current time, updating every second.
 *
 * Sync strategy:
 * - Aligns each update to the next exact second boundary using recursive timeouts.
 * - Prevents visible drift/desync between different clock widgets over time.
 * - Forces an immediate resync when tab/window becomes active again.
 *
 * @returns {Date} current time
 */
const useClock = () => {
    const [time, setTime] = useState(() => new Date());

    useEffect(() => {
        let timeoutId;
        let cancelled = false;

        const tick = () => setTime(new Date());

        const scheduleNextTick = () => {
            if (cancelled) return;
            const now = Date.now();
            const msUntilNextSecond = (1000 - (now % 1000)) % 1000;
            const delay = msUntilNextSecond === 0 ? 1 : msUntilNextSecond;

            timeoutId = setTimeout(() => {
                tick();
                scheduleNextTick();
            }, delay);
        };

        tick();
        scheduleNextTick();

        const handleVisibilityOrFocus = () => {
            if (cancelled) return;
            if (timeoutId) clearTimeout(timeoutId);
            tick();
            scheduleNextTick();
        };

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, []);

    return time;
};

export default useClock;



