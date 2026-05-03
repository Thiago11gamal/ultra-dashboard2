import { useEffect, useState } from 'react';

/**
 * Custom hook that returns the current time, updating every second.
 *
 * Sync strategy:
 * - Waits until the next exact second boundary before starting interval updates.
 * - Prevents visible drift/desync between different clock widgets over time.
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

        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    return time;
};

export default useClock;


