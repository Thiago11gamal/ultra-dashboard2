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
    const [epochSecond, setEpochSecond] = useState(() => Math.floor(Date.now() / 1000));

    useEffect(() => {
        let timeoutId;
        let cancelled = false;
        let lastRescheduleAt = 0;

        let baseWallMs = Date.now();
        let basePerfMs = performance.now();

        const nowFromStableClock = () => {
            const elapsed = performance.now() - basePerfMs;
            return baseWallMs + elapsed;
        };

        const recalibrate = () => {
            baseWallMs = Date.now();
            basePerfMs = performance.now();
        };

        const scheduleNextTick = () => {
            if (cancelled) return;
            const now = nowFromStableClock();
            const msUntilNextSecond = (1000 - (now % 1000)) % 1000;
            const delay = msUntilNextSecond === 0 ? 1 : msUntilNextSecond;

            timeoutId = setTimeout(() => {
                const stableNow = nowFromStableClock();
                const realNow = Date.now();

                // Se houver salto grande do relógio do sistema (NTP/sleep), recalibra a base.
                if (Math.abs(realNow - stableNow) > 1500) {
                    recalibrate();
                }

                const nowSecond = Math.floor(nowFromStableClock() / 1000);
                setEpochSecond(nowSecond);
                scheduleNextTick();
            }, delay);
        };

        scheduleNextTick();

        const handleVisibilityOrFocus = () => {
            if (cancelled) return;
            if (document.visibilityState !== 'visible') return;
            const nowMs = Date.now();
            if (nowMs - lastRescheduleAt < 250) return;
            lastRescheduleAt = nowMs;
            if (timeoutId) clearTimeout(timeoutId);
            recalibrate();
            setEpochSecond(Math.floor(nowFromStableClock() / 1000));
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

    return new Date(epochSecond * 1000);
};

export default useClock;






