import { useMemo, useSyncExternalStore } from 'react';

const listeners = new Set();
let timeoutId = null;
let currentEpochSecond = Math.floor(Date.now() / 1000);
let baseWallMs = Date.now();
let basePerfMs = typeof performance !== 'undefined' ? performance.now() : 0;
let lastRescheduleAt = 0;
let listenersAttached = false;

const getPerfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const nowFromStableClock = () => baseWallMs + (getPerfNow() - basePerfMs);

const recalibrate = () => {
    baseWallMs = Date.now();
    basePerfMs = getPerfNow();
};

const notifyListeners = (nextSecond) => {
    if (nextSecond === currentEpochSecond) return;
    currentEpochSecond = nextSecond;
    listeners.forEach((cb) => cb());
};

const scheduleNextTick = () => {
    if (listeners.size === 0) {
        timeoutId = null;
        return;
    }
    const now = nowFromStableClock();
    const msUntilNextSecond = (1000 - (now % 1000)) % 1000;
    const delay = msUntilNextSecond === 0 ? 1 : msUntilNextSecond;

    timeoutId = setTimeout(() => {
        if (listeners.size === 0) {
            timeoutId = null;
            return;
        }
        const stableNow = nowFromStableClock();
        const realNow = Date.now();
        if (Math.abs(realNow - stableNow) > 1500) {
            recalibrate();
        }
        notifyListeners(Math.floor(nowFromStableClock() / 1000));
        scheduleNextTick();
    }, delay);
};

const handleVisibilityOrFocus = () => {
    if (listeners.size === 0) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const nowMs = Date.now();
    if (nowMs - lastRescheduleAt < 250) return;
    lastRescheduleAt = nowMs;
    if (timeoutId) clearTimeout(timeoutId);
    recalibrate();
    notifyListeners(Math.floor(nowFromStableClock() / 1000));
    scheduleNextTick();
};

const subscribe = (cb) => {
    listeners.add(cb);
    if (listeners.size === 1) {
        recalibrate();
        currentEpochSecond = Math.floor(nowFromStableClock() / 1000);
        scheduleNextTick();
        if (!listenersAttached && typeof document !== 'undefined' && typeof window !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityOrFocus);
            window.addEventListener('focus', handleVisibilityOrFocus);
            listenersAttached = true;
        }
    }
    return () => {
        listeners.delete(cb);
        if (listeners.size === 0) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (listenersAttached && typeof document !== 'undefined' && typeof window !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
                window.removeEventListener('focus', handleVisibilityOrFocus);
                listenersAttached = false;
            }
        }
    };
};

const getSnapshot = () => currentEpochSecond;

const getDaySnapshot = () => {
    const d = new Date(currentEpochSecond * 1000);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * Shared singleton clock hook updating every second.
 * Consumers that only display the calendar date should use `useClockDate` to avoid 1s re-renders.
 *
 * @returns {Date} current time
 */
const useClock = () => {
    const epochSecond = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return useMemo(() => new Date(epochSecond * 1000), [epochSecond]);
};

export const useClockDate = () => {
    const dayKey = useSyncExternalStore(subscribe, getDaySnapshot, getDaySnapshot);
    return useMemo(() => {
        const [y, m, d] = dayKey.split('-').map(Number);
        return new Date(y, m, d);
    }, [dayKey]);
};

export default useClock;







