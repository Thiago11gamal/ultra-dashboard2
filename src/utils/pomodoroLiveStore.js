import { useSyncExternalStore } from 'react';

let liveTimeLeft = null;
const listeners = new Set();

export function publishLiveTimeLeft(seconds) {
    const next = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : null;
    if (next === liveTimeLeft) return;
    liveTimeLeft = next;
    listeners.forEach((cb) => cb());
}

export function clearLiveTimeLeft() {
    if (liveTimeLeft === null) return;
    liveTimeLeft = null;
    listeners.forEach((cb) => cb());
}

const subscribe = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};

export function useLivePomodoroTimeLeft(fallbackTimeLeft, isRunning) {
    const synced = useSyncExternalStore(
        subscribe,
        () => (isRunning && liveTimeLeft !== null ? liveTimeLeft : null),
        () => null
    );
    return synced !== null ? synced : fallbackTimeLeft;
}
