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
        let intervalId;
        let timeoutId;

        const tick = () => setTime(new Date());
        const scheduleAlignedInterval = () => {
            const now = Date.now();
            const msUntilNextSecond = 1000 - (now % 1000);

            timeoutId = setTimeout(() => {
                tick();
                intervalId = setInterval(tick, 1000);
            }, msUntilNextSecond);
        };

        scheduleAlignedInterval();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    return time;
};

export default useClock;

