# src\utils\audioAlert.js

```js
/**
 * ============================================================================
 * WEB AUDIO API POMODORO ALARM SYNTHESIZER
 * ============================================================================
 * Generates harmonious chime alerts using the native Web Audio API.
 * Eliminates missing 404 audio file issues and handles browser autoplay policies.
 */

let audioCtx = null;

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    return audioCtx;
}

export function playPomodoroAlarm(options = {}) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = options.notes || [587.33, 880, 1174.66]; // D5, A5, D6 harmonic chime
        const duration = options.duration || 0.35;
        const interval = options.interval || 0.12;

        notes.forEach((freq, index) => {
            const startTime = now + (index * interval);
            const stopTime = startTime + duration;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = options.waveType || 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // Envelope: Attack, sustain, smooth exponential decay
            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(stopTime);
        });
    } catch (err) {
        console.warn('[AudioAlert] Web Audio playback failed:', err);
    }
}


```
